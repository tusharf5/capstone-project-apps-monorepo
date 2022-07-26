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

import { CiStage } from "./ci-bff-api-stage";
import { WebappStage } from "./ci-webapp-stage";

interface CiStackProps extends StackProps {
  stage: string;
  branch: string;
}

// Docs at https://www.npmjs.com/package/@aws-cdk/pipelines

export class CiStack extends Stack {
  constructor(scope: Construct, id: string, props: CiStackProps) {
    super(scope, id, props);

    const sourceArtifact = CodePipelineSource.gitHub(
      "tusharf5/capstone-project-apps-monorepo",
      props.branch,
      {
        authentication: cdk.SecretValue.secretsManager("capstone-github-token"),
      }
    );

    const pipeline = new CodePipeline(this, "applications-pipeline", {
      pipelineName: `${props.stage}-${id}`,
      synth: new ShellStep("Synth", {
        input: sourceArtifact,
        installCommands: ['echo "Synth installCommands"'],
        commands: [
          'echo "Synth commands"',
          "cd teams/frontend/ci",
          "yarn install",
          "npx cdk synth",
        ],
        primaryOutputDirectory: "teams/frontend/ci/cdk.out",
      }),
    });

    const infraStage = new CiStage(this, "bff-api-resources", {
      env: { account: props.env!.account, region: props.env!.region },
      stage: props.stage,
    });

    pipeline.addStage(infraStage);

    const buildStep = new pipelines.CodeBuildStep("build-webapp-assets", {
      input: sourceArtifact,
      env: {
        NODE_ENV: props.stage,
        REACT_APP_NODE_ENV: props.stage,
      },
      commands: [
        'echo "Synth commands"',
        "cd teams/frontend/apps/front",
        "yarn install",
        "yarn build",
      ],
      rolePolicyStatements: [],
    });

    const buildStepWave = pipeline.addWave("build-webapp");

    buildStepWave.addPost(buildStep);

    const webappStage = new WebappStage(this, "webapp-resources", {
      env: { account: props.env!.account, region: props.env!.region },
      stage: props.stage,
    });

    pipeline.addStage(webappStage);

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
      input: sourceArtifact,
      commands: [
        'echo "I will build docker"',
        `REPO_URI=$(aws --region=${
          props.env!.region
        } ssm get-parameter --name "${`/${props.stage}/bff-api/repo-uri`}" --with-decryption --output text --query Parameter.Value)`,
        `cd teams/frontend/apps/bff-api`,
        `DOCKER_USERNAME=$(aws secretsmanager get-secret-value --secret-id "DOCKER_USERNAME" --output text --query SecretString)`,
        `DOCKER_ACCESS_TOKEN=$(aws secretsmanager get-secret-value --secret-id "DOCKER_ACCESS_TOKEN" --output text --query SecretString)`,
        `echo $DOCKER_ACCESS_TOKEN | docker login -u $DOCKER_USERNAME --password-stdin`,
        `docker build --build-arg NODE_ENV=${props.stage} -f docker/Dockerfile -t bff-api:latest .`,
        `docker logout`,
        `docker tag bff-api:latest "$REPO_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION"`,
        `aws ecr get-login-password --region ${
          props.env!.region
        } | docker login --username AWS --password-stdin ${
          props.env!.account
        }.dkr.ecr.${props.env!.region}.amazonaws.com`,
        `docker push "$REPO_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION"`,
        `export DOCKER_IMAGE_URI="$REPO_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION"`,
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
        new cdk.aws_iam.PolicyStatement({
          resources: [
            `arn:aws:secretsmanager:${props.env!.region}:${
              props.env!.account
            }:secret:DOCKER_USERNAME-dduUxa`,
            `arn:aws:secretsmanager:${props.env!.region}:${
              props.env!.account
            }:secret:DOCKER_ACCESS_TOKEN-3OR8wo`,
          ],
          actions: [
            "secretsmanager:GetSecretValue",
            "secretsmanager:GetResourcePolicy",
            "secretsmanager:DescribeSecret",
            "secretsmanager:ListSecretVersionIds",
          ],
          effect: cdk.aws_iam.Effect.ALLOW,
        }),
      ],
    });

    const buildWave = pipeline.addWave("build-docker");

    buildWave.addPost(buildImage);

    // addStage no longer means "add a CodePipeline Stage to the pipeline" --
    // it means: "deploy all stacks inside a cdk.Stage".
    // To add a stage use waves with post, pre

    const trigger = new pipelines.CodeBuildStep(
      "upload-bff-api-deployment-config",
      {
        input: sourceArtifact,
        env: {
          DOCKER_IMAGE_URI: buildImage.exportedVariable("DOCKER_IMAGE_URI"),
        },
        commands: [
          `touch config.json`,
          `echo '{"dockerImageURI":"'"$DOCKER_IMAGE_URI"'"}' > config.json`,
          `cat config.json`,
          `zip config.zip config.json`,
          `aws s3 cp config.zip s3://capstone-tusharf5-assets-bucket-${props.stage}/frontend/apps/bff-api/config.zip`,
        ],
        rolePolicyStatements: [
          new cdk.aws_iam.PolicyStatement({
            resources: [
              `arn:aws:s3:::capstone-tusharf5-assets-bucket-${props.stage}/frontend/*`,
            ],
            actions: ["s3:PutObject"],
            effect: cdk.aws_iam.Effect.ALLOW,
          }),
        ],
      }
    );

    const triggerWave = pipeline.addWave("upload-deployment-config");

    triggerWave.addPost(trigger);
  }
}
