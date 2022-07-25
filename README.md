# capstone-project-apps-monorepo

## installation

Get The OIDC Issuer for each env.

```shell
aws eks describe-cluster \                       
       --name dev-capstone \
       --query cluster.identity.oidc.issuer \
      --output text
```

```shell
cd teams/frontend/ci
cdk deploy teams-frontend-applications
```

```shell
cd teams/backend/ci
cdk deploy teams-backend-applications
```
