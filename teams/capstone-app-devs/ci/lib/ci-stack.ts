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

// Docs at https://www.npmjs.com/package/@aws-cdk/pipelines

export class CiStack extends Stack {
  constructor(scope: Construct, id: string, props: CiStackProps) {
    super(scope, id, props);

    const pipeline = new CodePipeline(this, "captstone-apps-pipeline", {
      pipelineName: `${props.stage}-captstone-apps-pipeline`,
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

    const infraStage = new CiStage(this, "service-a-resources", {
      env: { account: props.env!.account, region: props.env!.region },
      stage: props.stage,
    });

    pipeline.addStage(infraStage);

    /**
     * CDK pipelines will generate CodeBuild projects for each ShellStep you use,
     * and it will also generate CodeBuild projects to publish assets and
     * perform the self-mutation of the pipeline. To control the various
     * aspects of the CodeBuild projects that get generated, use a CodeBuildStep
     * instead of a ShellStep. This class has a number of properties that allow
     * you to customize various aspects of the projects:
     */

    // valueForStringParameter methods work by adding a CloudFormation parameter.
    // valueFromLookup methods work by actualy fetching during the synth process

    const buildImage = new pipelines.CodeBuildStep("build-docker-image", {
      commands: [
        'echo "I will build docker"',
        `echo $(aws --region=${
          props.env!.region
        } ssm get-parameter --name "${`/${props.stage}/service-a/repo-uri`}" --with-decryption --output text --query Parameter.Value)`,
      ],
      buildEnvironment: {
        privileged: true,
      },
      rolePolicyStatements: [
        new cdk.aws_iam.PolicyStatement({
          resources: ["*"],
          actions: ["ecr:*"],
          effect: cdk.aws_iam.Effect.ALLOW,
        }),
        new cdk.aws_iam.PolicyStatement({
          resources: ["*"],
          actions: ["ssm:GetParameter"],
          effect: cdk.aws_iam.Effect.ALLOW,
        }),
      ],
    });

    const buildWave = pipeline.addWave("build-docker");

    buildWave.addPost(buildImage);

    // addStage no longer means "add a CodePipeline Stage to the pipeline" --
    // it means: "deploy all stacks inside a cdk.Stage".
    // To add a stage use waves with post, pre

    const trigger = new pipelines.ShellStep("trigger-manifest-changes", {
      commands: ['echo " I will trigger another pipeline "'],
    });

    const triggerWave = pipeline.addWave("trigger-next");

    triggerWave.addPost(trigger);

    // // Add our CodeBuild project to our CodePipeline
    // const buildAction = new pipelines.CodeBuildStep("", {
    //   input: CodePipelineSource.gitHub(
    //     "tusharf5/capstone-project-apps-monorepo",
    //     props.branch,
    //     {
    //       authentication: cdk.SecretValue.secretsManager(
    //         "capstone-github-token"
    //       ),
    //     }
    //   ),
    //   commands: [],
    // });

    // CodeCommit repository that contains the Dockerfile used to build our ECR image:
    // code_repo = new codecommit.Repository(this, "codeRepository", {
    //   repositoryName: "container-image-repo",
    // });
  }
}
