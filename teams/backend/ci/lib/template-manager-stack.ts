import * as cdk from "aws-cdk-lib";
import { FederatedPrincipal } from "aws-cdk-lib/aws-iam";
import { BlockPublicAccess, BucketEncryption } from "aws-cdk-lib/aws-s3";
import { ParameterType } from "aws-cdk-lib/aws-ssm";
import {
  AwsCustomResource,
  AwsCustomResourcePolicy,
  PhysicalResourceId,
} from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";

interface Props {
  region: string;
  stage: string;
  account: string;
}

export class BffApiStack extends cdk.Stack {
  public readonly serviceARepo: string;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    const serviceARepo = new cdk.aws_ecr.Repository(
      this,
      "template-manager-repo",
      {
        imageScanOnPush: true,
        repositoryName: `${props.stage}-template-manager`,
      }
    );

    new cdk.aws_ssm.StringParameter(this, "template-manager-repo-uri-param", {
      parameterName: `/${props.stage}/template-manager/repo-uri`,
      type: ParameterType.STRING,
      stringValue: serviceARepo.repositoryUri,
    });

    new cdk.aws_ssm.StringParameter(this, "template-manager-repo-arn-param", {
      parameterName: `/${props.stage}/template-manager/repo-arn`,
      type: ParameterType.STRING,
      stringValue: serviceARepo.repositoryArn,
    });

    const oidcProvider =
      props.stage === "dev"
        ? "oidc.eks.us-west-2.amazonaws.com/id/C92FB9F4B3CC89B5B092C5DA11CBBBF1"
        : "";

    const iamrole = new cdk.aws_iam.Role(
      this,
      "pod-service-account-linked-role",
      {
        assumedBy: new FederatedPrincipal(
          `arn:aws:iam::${props.account}:oidc-provider/${oidcProvider}`,
          {
            StringEquals: {
              [`${oidcProvider}:aud`]: "sts.amazonaws.com",
              [`${oidcProvider}:sub`]:
                "system:serviceaccount:team-backend:template-manager-pods-sa",
            },
          },
          "sts:AssumeRoleWithWebIdentity"
        ),
      }
    );

    new cdk.CfnOutput(this, "podRoleBackend", {
      value: iamrole.roleArn,
      description: "The arn of the pod role",
      exportName: "podRoleBackend",
    });
  }
}
