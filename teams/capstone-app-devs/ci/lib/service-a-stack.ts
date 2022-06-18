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

    const serviceARepo = new cdk.aws_ecr.Repository(this, "ServiceARepo", {
      imageScanOnPush: true,
      repositoryName: `${props.stage}-service-a`,
    });

    new cdk.aws_ssm.StringParameter(this, "ServiceARepoUriParam", {
      parameterName: `/${props.stage}/service-a/repo-uri`,
      type: ParameterType.STRING,
      stringValue: serviceARepo.repositoryUri,
    });
    new cdk.aws_ssm.StringParameter(this, "ServiceARepoUriParam", {
      parameterName: `/${props.stage}/service-a/repo-arn`,
      type: ParameterType.STRING,
      stringValue: serviceARepo.repositoryArn,
    });
  }
}
