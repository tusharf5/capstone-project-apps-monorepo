import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

import { ServiceAStack } from "./bff-api-stack";

interface StageProps extends cdk.StageProps {
  stage: string;
}

export class CiStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props: StageProps) {
    super(scope, id, props);

    new ServiceAStack(this, "core-stack", {
      stage: props.stage,
      region: props.env!.region!,
    });
  }
}
