import urllib.request
import os
import subprocess

cache_dir = os.path.expandvars(r"%LOCALAPPDATA%\electron-builder\Cache\winCodeSign")
os.makedirs(cache_dir, exist_ok=True)
target_dir = os.path.join(cache_dir, "winCodeSign-2.6.0")
archive_path = os.path.join(cache_dir, "winCodeSign-2.6.0.7z")

if not os.path.exists(target_dir):
    if not os.path.exists(archive_path):
        print("Downloading winCodeSign...")
        urllib.request.urlretrieve("https://github.com/electron-userland/electron-builder-binaries/releases/download/winCodeSign-2.6.0/winCodeSign-2.6.0.7z", archive_path)
    
    print("Extracting...")
    exe_7z = os.path.join(os.path.dirname(__file__), "node_modules", "7zip-bin", "win", "x64", "7za.exe")
    # Extract, it will complain about symlinks but we ignore the error
    subprocess.run([exe_7z, "x", "-y", f"-o{target_dir}", archive_path])
    
    print("Extracted to", target_dir)
else:
    print("Target already exists")
