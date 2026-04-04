import os, subprocess, sys, zipfile, shutil

pkg = "BackEnd/package"
if os.path.exists(pkg):
    shutil.rmtree(pkg)
os.makedirs(pkg, exist_ok=True)

print("Downloading Linux-compatible dependencies for AWS Lambda...")
subprocess.run([sys.executable, "-m", "pip", "install", 
    "--platform", "manylinux2014_x86_64", 
    "--target", pkg, 
    "--implementation", "cp", 
    "--python-version", "3.10", 
    "--only-binary=:all:", 
    "--upgrade", "-r", "BackEnd/lambda_requirements.txt"], check=True)

lambdas = ["image_processor", "thumbnail_generator", "clustering_processor"]
zips_dir = "BackEnd/deploy_zips"
os.makedirs(zips_dir, exist_ok=True)

print("Building Zip bundles...")
for l in lambdas:
    z_path = os.path.join(zips_dir, f"{l}.zip")
    with zipfile.ZipFile(z_path, 'w', zipfile.ZIP_DEFLATED) as z:
        # 1. Pip Dependencies
        for root, dirs, files in os.walk(pkg):
            for f in files:
                abs_f = os.path.join(root, f)
                rel_f = os.path.relpath(abs_f, pkg)
                z.write(abs_f, rel_f)
        
        # 2. Main Lambda File
        z.write(f"BackEnd/lambda/{l}.py", f"{l}.py")
        
        # 3. Helpers (services, utils)
        for fdr in ["services", "utils"]:
            for root, dirs, files in os.walk(f"BackEnd/{fdr}"):
                for f in files:
                    if f.endswith(".py"):
                        abs_f = os.path.join(root, f)
                        rel_f = os.path.relpath(abs_f, "BackEnd")
                        z.write(abs_f, rel_f)
                        
        # 4. Config files
        z.write("BackEnd/config.py", "config.py")
        if os.path.exists("BackEnd/.env"):
            z.write("BackEnd/.env", ".env")

print("Cleanup...")
shutil.rmtree(pkg)
print("SUCCESS - Built all Lambda Zip files perfectly for Linux x86_64.")
