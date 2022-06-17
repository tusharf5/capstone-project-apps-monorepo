import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  CodePipeline,
  CodePipelineSource,
  ShellStep,
} from "aws-cdk-lib/pipelines";
import * as cdk from "aws-cdk-lib";

import { CiStage } from "./ci-stage";

interface CiStackProps extends StackProps {
  stage: string;
  branch: string;
}

export class CiStack extends Stack {
  constructor(scope: Construct, id: string, props: CiStackProps) {
    super(scope, id, props);

    const pipeline = new CodePipeline(this, "CaptstonePipeline", {
      pipelineName: `${props.stage}-captstone-pipeline`,
      synth: new ShellStep("Synth", {
        input: CodePipelineSource.gitHub(
          "tusharf5/capstone-project-apps-monorepo",
          props.branch,
          {
            authentication: cdk.SecretValue.secretsManager(
              "capstone-github-token"
            ),
          }
        ),
        commands: ["ls"],
      }),
    });

    const stage = pipeline.addStage(
      new CiStage(this, props.stage, {
        env: { account: props.env!.account, region: props.env!.region },
        stage: props.stage,
      })
    );

    // const uri = cdk.aws_ssm.StringParameter.valueForStringParameter(
    //   this,
    //   `${props.stage}/service-a/repo-uri`
    // );

    // https://cdk8s.io/

    // stage.addPost(
    //   new ShellStep("triggerCD", {
    //     commands: [],
    //   })
    // );
  }
}
