/* Tiny Windows opener for Somut Slip. Built with mingw: x86_64-w64-mingw32-gcc */
#include <windows.h>
#include <shellapi.h>

int WINAPI WinMain(HINSTANCE a, HINSTANCE b, LPSTR c, int d) {
  (void)a; (void)b; (void)c; (void)d;
  ShellExecuteA(NULL, "open", "http://127.0.0.1:8080/", NULL, NULL, SW_SHOWNORMAL);
  if (GetFileAttributesA("package.json") != INVALID_FILE_ATTRIBUTES) {
    ShellExecuteA(NULL, "open", "cmd.exe", "/c npm run dev", NULL, SW_HIDE);
  }
  return 0;
}
