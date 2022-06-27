import * as cdk from "aws-cdk-lib";
import { ParameterType } from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";

interface Props {
  region: string;
  stage: string;
}

export class ServiceAStack extends cdk.Stack {
  public readonly serviceARepo: string;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    const serviceARepo = new cdk.aws_ecr.Repository(this, "bff-api-repo", {
      imageScanOnPush: true,
      repositoryName: `${props.stage}-bff-api`,
    });

    new cdk.aws_ssm.StringParameter(this, "bff-api-repo-uri-param", {
      parameterName: `/${props.stage}/bff-api/repo-uri`,
      type: ParameterType.STRING,
      stringValue: serviceARepo.repositoryUri,
    });

    new cdk.aws_ssm.StringParameter(this, "bff-api-repo-arn-param", {
      parameterName: `/${props.stage}/bff-api/repo-arn`,
      type: ParameterType.STRING,
      stringValue: serviceARepo.repositoryArn,
    });
  }
}
