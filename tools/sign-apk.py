"""Sign a CI-built unsigned APK with a private local key bundle. Never upload the bundle to GitHub."""
import argparse,json,os,subprocess,tempfile,zipfile
from pathlib import Path

p=argparse.ArgumentParser()
p.add_argument('--apk',required=True)
p.add_argument('--signer',required=True)
p.add_argument('--key-bundle',required=True)
p.add_argument('--out',required=True)
a=p.parse_args()
with tempfile.TemporaryDirectory(prefix='bodydream-sign-') as temp:
 key=Path(temp)/'release.p12'
 with zipfile.ZipFile(a.key_bundle) as z:
  config=json.loads(z.read('signing.json'))
  key.write_bytes(z.read('release.p12'));key.chmod(0o600)
 env={**os.environ,'BD_SIGNING_PASSWORD':config['password']}
 subprocess.run(['java','-jar',a.signer,'sign','--ks',str(key),'--ks-key-alias',config['alias'],'--ks-pass','env:BD_SIGNING_PASSWORD','--key-pass','env:BD_SIGNING_PASSWORD','--out',a.out,a.apk],env=env,check=True)
 subprocess.run(['java','-jar',a.signer,'verify','--verbose','--print-certs',a.out],check=True)
print('Signed APK verified:',a.out)
