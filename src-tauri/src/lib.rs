use std::net::TcpStream;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, Instant};
use tauri::{Manager, RunEvent, WebviewUrl, WebviewWindowBuilder};

struct SidecarState(Mutex<Option<Child>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let port = std::env::var("RESUME_BUILDER_PORT").unwrap_or_else(|_| "4173".into());
            let url = format!("http://127.0.0.1:{port}/");
            let spawned = spawn_node_sidecar(&port)?;
            app.manage(SidecarState(Mutex::new(spawned)));

            if !wait_for_port("127.0.0.1", &port, Duration::from_secs(20)) {
                return Err("Node sidecar did not start on time".into());
            }

            let mut builder = WebviewWindowBuilder::new(app.handle(), "main", WebviewUrl::External(url.parse()?))
                .title("Resume Builder")
                .inner_size(1320.0, 900.0)
                .min_inner_size(800.0, 600.0)
                .resizable(true)
                .center();

            #[cfg(target_os = "windows")]
            {
                builder = builder.additional_browser_args("--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection");
            }

            builder.build()?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("failed to start Resume Builder")
        .run(|app, event| {
            if let RunEvent::Exit = event {
                if let Some(state) = app.try_state::<SidecarState>() {
                    if let Ok(mut guard) = state.0.lock() {
                        if let Some(mut child) = guard.take() {
                            let _ = child.kill();
                            let _ = child.wait();
                        }
                    }
                }
            }
        });
}

fn spawn_node_sidecar(port: &str) -> Result<Option<Child>, Box<dyn std::error::Error>> {
    if wait_for_port("127.0.0.1", port, Duration::from_millis(250)) {
        eprintln!("Reusing existing Resume Builder server on port {port}");
        return Ok(None);
    }

    let node = std::env::var("RESUME_BUILDER_NODE").unwrap_or_else(|_| "node".into());
    let cli = std::env::var("RESUME_BUILDER_CLI").expect("RESUME_BUILDER_CLI is required");
    let workspace = std::env::var("RESUME_BUILDER_WORKSPACE").expect("RESUME_BUILDER_WORKSPACE is required");

    let mut command = Command::new(node);
    command
        .arg(cli)
        .args(["serve", "--sidecar", "--port", port, "--dir"])
        .arg(&workspace)
        .stdin(Stdio::null())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit());

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000);
    }

    Ok(Some(command.spawn()?))
}

fn wait_for_port(host: &str, port: &str, timeout: Duration) -> bool {
    let address = format!("{host}:{port}");
    let start = Instant::now();
    while start.elapsed() < timeout {
        if TcpStream::connect(&address).is_ok() {
            return true;
        }
        thread::sleep(Duration::from_millis(150));
    }
    false
}
