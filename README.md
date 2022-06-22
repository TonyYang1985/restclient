
## publish project to npm registry
> npm login 
  username: xxx
  password:xxx
  email:xxxx
### Config repository
> config set registry=https://registry.npmjs.org


### edit package.json
 "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  },

### publish project
> npm  publish