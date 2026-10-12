import os
import zipfile

base_dir = os.path.dirname(os.path.abspath(__file__))
zip_path = os.path.join(base_dir, "leadgrid-pro-v1.0.0.zip")

include_dirs = ["popup", "content", "background", "enricher", "icons"]
include_files = ["manifest.json"]

with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zip_out:
    for f in include_files:
        full_path = os.path.join(base_dir, f)
        if os.path.exists(full_path):
            zip_out.write(full_path, f)

    for d in include_dirs:
        dir_path = os.path.join(base_dir, d)
        if os.path.exists(dir_path):
            for root, _, files in os.walk(dir_path):
                for file in files:
                    full_p = os.path.join(root, file)
                    rel_p = os.path.relpath(full_p, base_dir)
                    zip_out.write(full_p, rel_p)

print(f"Extension zipped successfully: {zip_path}")
