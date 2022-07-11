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

    const sourceArtifact = CodePipelineSource.gitHub(
      "tusharf5/capstone-project-apps-monorepo",
      props.branch,
      {
        authentication: cdk.SecretValue.secretsManager("capstone-github-token"),
      }
    );

    /* @example
     * // Access the CommitId of a GitHub source in the synth
     * const source = pipelines.CodePipelineSource.gitHub('owner/repo', 'main');
     *
     * const pipeline = new pipelines.CodePipeline(scope, 'MyPipeline', {
     *   synth: new pipelines.ShellStep('Synth', {
     *     input: source,
     *     commands: [],
     *     env: {
     *       'COMMIT_ID': source.sourceAttribute('CommitId'),
     *     }
     *   })
     * });
     */

    const pipeline = new CodePipeline(this, "applications-pipeline", {
      pipelineName: `${props.stage}-${id}`,
      synth: new ShellStep("Synth", {
        input: sourceArtifact,
        installCommands: ['echo "Synth installCommands"'],
        commands: [
          'echo "Synth commands"',
          "cd teams/backend/ci",
          "yarn install",
          "npx cdk synth",
        ],
        primaryOutputDirectory: "teams/backend/ci/cdk.out",
      }),
    });

    const infraStage = new CiStage(this, "template-manager-resources", {
      env: { account: props.env!.account, region: props.env!.region },
      stage: props.stage,
    });

    pipeline.addStage(infraStage);

    const buildImage = new pipelines.CodeBuildStep("build-docker-image", {
      input: sourceArtifact,
      commands: [
        'echo "I will build docker"',
        `REPO_URI=$(aws --region=${
          props.env!.region
        } ssm get-parameter --name "${`/${props.stage}/template-manager/repo-uri`}" --with-decryption --output text --query Parameter.Value)`,
        `cd teams/backend/apps/template-manager`,
        `DOCKER_USERNAME=$(aws secretsmanager get-secret-value --secret-id "DOCKER_USERNAME" --output text --query SecretString)`,
        `DOCKER_ACCESS_TOKEN=$(aws secretsmanager get-secret-value --secret-id "DOCKER_ACCESS_TOKEN" --output text --query SecretString)`,
        `echo $DOCKER_ACCESS_TOKEN | docker login -u $DOCKER_USERNAME --password-stdin`,
        `docker build -f docker/Dockerfile -t template-manager:latest .`,
        `docker logout`,
        `docker tag template-manager:latest "$REPO_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION"`,
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
      "upload-template-manager-deployment-config",
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
          `aws s3 cp config.zip s3://capstone-tusharf5-assets-bucket-${props.stage}/backend/apps/template-manager/config.zip`,
        ],
        rolePolicyStatements: [
          new cdk.aws_iam.PolicyStatement({
            resources: [
              `arn:aws:s3:::capstone-tusharf5-assets-bucket-${props.stage}/backend/*`,
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
