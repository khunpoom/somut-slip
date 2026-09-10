#!/usr/bin/env python3
"""Build a tiny 32-bit Windows PE that opens the local Somut Slip app."""

from __future__ import annotations

import pathlib
import struct

OUT = pathlib.Path(__file__).resolve().parents[1] / "public" / "SomutSlip.exe"

URL = b"http://127.0.0.1:8080/\0"
VERB = b"open\0"
DLL = b"SHELL32.dll\0"
HINT_NAME = b"\x00\x00ShellExecuteA\x00"
# pad to even
if len(HINT_NAME) % 2:
    HINT_NAME += b"\x00"


def u16(n: int) -> bytes:
    return struct.pack("<H", n)


def u32(n: int) -> bytes:
    return struct.pack("<I", n)


def align(data: bytes, n: int) -> bytes:
    pad = (n - (len(data) % n)) % n
    return data + b"\x00" * pad


# Layout (all RVAs in section starting at 0x1000, file offset 0x200)
#  0x00  code
#  then strings, IAT, ILT, hint/name, dll name, import descriptors

code = bytes(
    [
        0x6A, 0x01,  # push 1  SW_SHOWNORMAL
        0x6A, 0x00,  # push 0  lpDirectory
        0x6A, 0x00,  # push 0  lpParameters
        0x68, 0, 0, 0, 0,  # push url  (patch +7)
        0x68, 0, 0, 0, 0,  # push verb (patch +12)
        0x6A, 0x00,  # push 0 hwnd
        0xFF, 0x15, 0, 0, 0, 0,  # call [iat] (patch +20)
        0x6A, 0x00,  # push 0
        0xB8, 0x00, 0x00, 0x00, 0x00,  # mov eax, ExitProcess later via ret
        0xC3,  # ret — process stays; ShellExecute is enough
    ]
)

# We'll use ExitProcess from kernel32 instead of ret, so the console/window exits cleanly.
# For a GUI subsystem PE, ret from WinMain-equivalent just exits.

FILE_ALIGN = 0x200
SECT_ALIGN = 0x1000
PE_OFF = 0x80


def build() -> bytes:
    # We'll assemble .text contents then wrap headers.
    # Import table for SHELL32!ShellExecuteA only.

    # Place after code, 4-byte aligned
    payload = align(code, 4)
    url_off = len(payload)
    payload += URL
    verb_off = len(payload)
    payload += VERB
    payload = align(payload, 4)

    # IMAGE_IMPORT_DESCRIPTOR (one real + null)
    # We'll append IAT/ILT/names then patch RVAs.

    # Memory:
    # section rva = 0x1000
    def rva(off: int) -> int:
        return 0x1000 + off

    # Patch code pushes and call
    # call [IAT] — IAT placed after names; we'll rebuild in two passes.

    names = HINT_NAME
    dll = DLL

    # ILT / IAT: one thunk (rva of hint/name) + null
    # We'll compute once we know offsets.

    # Order in payload:
    # code+strings (already)
    # hint/name
    # dll name
    # ILT (8 bytes: rva, 0)
    # IAT (8 bytes: rva, 0)
    # import dir (20*2)

    hint_off = len(payload)
    payload += names
    payload = align(payload, 2)
    dll_off = len(payload)
    payload += dll
    payload = align(payload, 4)
    ilt_off = len(payload)
    payload += u32(0) + u32(0)  # patched
    iat_off = len(payload)
    payload += u32(0) + u32(0)
    imp_off = len(payload)
    payload += b"\x00" * 40  # 2 descriptors

    payload = bytearray(payload)
    payload[ilt_off : ilt_off + 4] = u32(rva(hint_off))
    payload[iat_off : iat_off + 4] = u32(rva(hint_off))

    # descriptor: OriginalFirstThunk, TimeDateStamp, Forwarder, Name, FirstThunk
    desc = (
        u32(rva(ilt_off))
        + u32(0)
        + u32(0)
        + u32(rva(dll_off))
        + u32(rva(iat_off))
        + b"\x00" * 20
    )
    payload[imp_off : imp_off + 40] = desc

    # patch code
    payload[7:11] = u32(rva(url_off))
    payload[12:16] = u32(rva(verb_off))
    payload[20:24] = u32(rva(iat_off))

    raw = align(bytes(payload), FILE_ALIGN)
    raw_size = len(raw)
    virt_size = len(payload)

    # DOS header
    dos = bytearray(PE_OFF)
    dos[0:2] = b"MZ"
    dos[0x3C:0x40] = u32(PE_OFF)
    # tiny stub
    dos[0x40:0x4E] = bytes([0x0E, 0x1F, 0xBA, 0x0E, 0x00, 0xB4, 0x09, 0xCD, 0x21, 0xB8, 0x01, 0x4C, 0xCD, 0x21])

    # COFF + optional PE32
    coff = b"PE\x00\x00" + u16(0x14C) + u16(1)  # i386, 1 section
    coff += u32(0) + u32(0) + u32(0)
    opt_size = 0xE0
    coff += u16(opt_size) + u16(0x102)  # 32-bit, executable

    opt = u16(0x10B)  # PE32
    opt += b"\x0A\x00"  # linker
    opt += u32(raw_size) + u32(0) + u32(0)  # code size
    opt += u32(0x1000)  # entry
    opt += u32(0x1000)  # base of code
    opt += u32(0x1000)  # base of data
    opt += u32(0x00400000)  # image base
    opt += u32(SECT_ALIGN) + u32(FILE_ALIGN)
    opt += u16(4) + u16(0) + u16(0) + u16(0) + u16(4) + u16(0)
    opt += u32(0)
    image_size = SECT_ALIGN + align_n(virt_size, SECT_ALIGN)
    headers = 0x200
    opt += u32(image_size) + u32(headers) + u32(0)
    opt += u16(2) + u16(0)  # IMAGE_SUBSYSTEM_WINDOWS_GUI
    opt += u32(0x100000) + u32(0x1000) + u32(0x100000) + u32(0x1000)
    opt += u32(0) + u32(16)
    dirs = [ (0, 0) ] * 16
    dirs[1] = (rva(imp_off), 40)  # import
    dirs[12] = (rva(iat_off), 8)  # IAT
    dir_bytes = b"".join(u32(a) + u32(b) for a, b in dirs)
    opt += dir_bytes
    assert len(opt) == opt_size, len(opt)

    sect_name = b".text\x00\x00\x00"
    sect = sect_name + u32(virt_size) + u32(0x1000) + u32(raw_size) + u32(0x200)
    sect += u32(0) * 3
    sect += u32(0xE0000020)  # code | exec | read | write (write for IAT)

    headers_blob = bytes(dos) + coff + opt + sect
    headers_blob = align(headers_blob, FILE_ALIGN)
    return headers_blob + raw


def align_n(v: int, n: int) -> int:
    return (v + n - 1) // n * n


def main() -> None:
    data = build()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_bytes(data)
    print(f"wrote {OUT} ({len(data)} bytes)")


if __name__ == "__main__":
    main()
