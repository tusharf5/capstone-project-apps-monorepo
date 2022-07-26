import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

interface Props {
  region: string;
  stage: string;
  account: string;
}

export class Webapp extends cdk.Stack {
  public readonly serviceARepo: string;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id);

    const siteBucket = new cdk.aws_s3.Bucket(this, "SiteBucket", {
      bucketName: "capstone-web-app-source" + props.stage,
      websiteIndexDocument: "index.html",
      publicReadAccess: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const siteDistribution = new cdk.aws_cloudfront.CloudFrontWebDistribution(
      this,
      "SiteDistribution",
      {
        originConfigs: [
          {
            customOriginSource: {
              domainName: siteBucket.bucketWebsiteDomainName,
              originProtocolPolicy:
                cdk.aws_cloudfront.OriginProtocolPolicy.HTTP_ONLY,
            },
            behaviors: [
              {
                isDefaultBehavior: true,
              },
            ],
          },
        ],
      }
    );

    //Deploy site to s3 ci/build
    new cdk.aws_s3_deployment.BucketDeployment(this, "Deployment", {
      sources: [
        cdk.aws_s3_deployment.Source.asset("../../frontend/apps/front/build"),
      ],
      destinationBucket: siteBucket,
      distribution: siteDistribution,
      distributionPaths: ["/*"],
    });
  }
}
