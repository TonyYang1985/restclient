
npm config ls -l

## publish project to npm registry
> npm login 
  username: xxx
  password:xxx
  email:xxxx
### Config repository
> npm install -g https://tls-test.npmjs.com/tls-test-1.0.0.tgz
> npm config set registry=https://registry.npmjs.org/

npm config set registry https://registry.npmjs.org

### add  .npmrc file
registry=https://registry.npmjs.org/
_auth=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
strict-ssl=false
always-auth=true


### edit package.json
 "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  },

### publish project
> npm publish --access public


###  change version package.json & update version 
> yarn  prepublish   (package.json)
> npm publish --access public