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

    const pipeline = new CodePipeline(this, "captstone-apps-pipeline", {
      pipelineName: `${props.stage}-captstone-apps-pipeline`,
      synth: new ShellStep("Synth", {
        input: sourceArtifact,
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

    /* // Access the output of one CodeBuildStep in another CodeBuildStep
     * declare const pipeline: pipelines.CodePipeline;
     *
     * const step1 = new pipelines.CodeBuildStep('Step1', {
     *   commands: ['export MY_VAR=hello'],
     * });
     *
     * const step2 = new pipelines.CodeBuildStep('Step2', {
     *   env: {
     *     IMPORTED_VAR: step1.exportedVariable('MY_VAR'),
     *   },
     *   commands: ['echo $IMPORTED_VAR'],
     * });
     */

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
      input: sourceArtifact,
      commands: [
        'echo "I will build docker"',
        `REPO_URI=$(aws --region=${
          props.env!.region
        } ssm get-parameter --name "${`/${props.stage}/service-a/repo-uri`}" --with-decryption --output text --query Parameter.Value)`,
        `cd teams/capstone-app-devs/${props.stage}/service-a`,
        `DOCKER_USERNAME=$(aws secretsmanager get-secret-value --secret-id "DOCKER_USERNAME" --output text --query SecretString)`,
        `DOCKER_ACCESS_TOKEN=$(aws secretsmanager get-secret-value --secret-id "DOCKER_ACCESS_TOKEN" --output text --query SecretString)`,
        `echo $DOCKER_ACCESS_TOKEN | docker login -u $DOCKER_USERNAME --password-stdin`,
        `docker build -f src/Dockerfile -t service-a:latest .`,
        `docker logout`,
        `docker tag service-a:latest "$REPO_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION"`,
        `aws ecr get-login-password --region ${
          props.env!.region
        } | docker login --username AWS --password-stdin ${
          props.env!.account
        }.dkr.ecr.${props.env!.region}.amazonaws.com`,
        `docker push "$REPO_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION"`,
        `export SERVICE_A_IMAGE_URI="$REPO_URI:$CODEBUILD_RESOLVED_SOURCE_VERSION"`,
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
      "upload-service-a-deployment-config",
      {
        input: sourceArtifact,
        env: {
          SERVICE_A_IMAGE_URI: buildImage.exportedVariable(
            "SERVICE_A_IMAGE_URI"
          ),
        },
        commands: [
          `touch config.json`,
          `echo '{"serviceA":{"dockerImageURI":"'"$SERVICE_A_IMAGE_URI"'"}}' > config.json`,
          `cat config.json`,
          `zip config.zip config.json`,
          `aws s3 cp config.zip s3://capstone-tusharf5-pipeline-assets-bucket/${props.stage}/service-a/config.zip`,
        ],
        rolePolicyStatements: [
          new cdk.aws_iam.PolicyStatement({
            resources: [
              `arn:aws:s3:::capstone-tusharf5-pipeline-assets-bucket/${props.stage}/service-a/*`,
            ],
            actions: ["s3:PutObject"],
            effect: cdk.aws_iam.Effect.ALLOW,
          }),
        ],
      }
    );

    // pipeline
    //   .addWave("manual-approval")
    //   .addPre(new pipelines.ManualApprovalStep("manual-approval"));

    const triggerWave = pipeline.addWave("upload-deployment-config");

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
