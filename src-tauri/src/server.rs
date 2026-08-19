use std::net::{TcpListener, TcpStream};
use std::time::{Duration, Instant};

/// Fixed, not allocated: the API only sends `Access-Control-Allow-Origin` for
/// allowlisted origins, and `http://localhost:3000` is the one that matches. Any
/// other port — or `127.0.0.1` — is a different origin, so every credentialed
/// request is blocked and login never gets its cookie.
pub const SERVER_PORT: u16 = 3000;

pub fn port_in_use(port: u16) -> bool {
  TcpListener::bind(("127.0.0.1", port)).is_err()
}

/// Poll until the server accepts connections, so the webview never loads early.
pub fn wait_for_server(port: u16, timeout: Duration) -> bool {
  let deadline = Instant::now() + timeout;
  while Instant::now() < deadline {
    if TcpStream::connect(("127.0.0.1", port)).is_ok() {
      return true;
    }
    std::thread::sleep(Duration::from_millis(100));
  }
  false
}
