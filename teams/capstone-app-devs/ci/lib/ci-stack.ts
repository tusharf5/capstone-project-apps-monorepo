import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  CodePipeline,
  CodePipelineSource,
  ShellStep,
  Step,
} from "aws-cdk-lib/pipelines";
import * as cdk from "aws-cdk-lib";
import * as pipelines from "aws-cdk-lib/pipelines";

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
        installCommands: ['echo "Synth installCommands"'],
        commands: [
          'echo "Synth commands"',
          "cd teams/capstone-app-devs/ci",
          "yarn install",
          "npx cdk synth",
        ],
        primaryOutputDirectory: "teams/capstone-app-devs/ci/cdk.out",
      }),
    });

    const buildStage = new CiStage(this, "BuildServiceA", {
      env: { account: props.env!.account, region: props.env!.region },
      stage: props.stage,
    });

    const stage = pipeline.addStage(buildStage);

    // stage.addPre(
    //   new pipelines.ShellStep("Change Dir", {
    //     commands: ["ls", "cd teams/capstone-app-devs/ci"],
    //   })
    // );
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
