# capstone-project-apps-monorepo

## installation

Get The OIDC Issuer for each env.

```shell
aws eks describe-cluster \                       
       --name dev-capstone \
       --query cluster.identity.oidc.issuer \
      --output text
```
