import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

import { BffApiStack } from "./bff-api-stack";

interface StageProps extends cdk.StageProps {
  stage: string;
}

export class CiStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props: StageProps) {
    super(scope, id, props);

    new BffApiStack(this, "core-stack", {
      stage: props.stage,
      region: props.env!.region!,
      account: props.env?.account!,
    });
  }
}
