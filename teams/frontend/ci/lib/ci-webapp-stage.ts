import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

import { Webapp } from "./webapp-stack";

interface StageProps extends cdk.StageProps {
  stage: string;
}

export class WebappStage extends cdk.Stage {
  constructor(scope: Construct, id: string, props: StageProps) {
    super(scope, id, props);

    new Webapp(this, "webapp-stack", {
      stage: props.stage,
      region: props.env!.region!,
      account: props.env?.account!,
    });
  }
}
