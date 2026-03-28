# ─────────────────────────────────────────────────────────────────
#  EazyBank — Terraform: EC2 + VPC + Security Groups
#
#  Creates:
#    - VPC with public subnet
#    - Security Group with only required ports
#    - EC2 instance (Amazon Linux 2023) for kubeadm K8s
#    - EBS volume for Elasticsearch data
#    - Elastic IP for stable public access
#    - IAM instance profile (for IRSA / AWS SSM access)
#    - S3 bucket for Trivy reports
#
#  Usage:
#    terraform init
#    terraform plan -var="key_name=your-key" -var="allowed_ip=YOUR_IP/32"
#    terraform apply
#
#  Variables file: terraform.tfvars (see bottom of this file)
# ─────────────────────────────────────────────────────────────────

terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Uncomment to use S3 remote state:
  # backend "s3" {
  #   bucket = "eazybank-tfstate"
  #   key    = "frontend/terraform.tfstate"
  #   region = "ap-south-1"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "eazybank"
      Environment = var.environment
      ManagedBy   = "terraform"
      Team        = "platform"
    }
  }
}

# ── Variables ──────────────────────────────────────────────────────
variable "aws_region"   { default = "ap-south-1" }
variable "environment"  { default = "production" }
variable "key_name"     { description = "EC2 key pair name" }
variable "allowed_ip"   { description = "Your IP for SSH/kubectl (e.g. 1.2.3.4/32)" }
variable "instance_type" { default = "t3.medium" }  # 2 vCPU, 4GB — minimum for K8s
variable "ami_id" {
  # Amazon Linux 2023 ap-south-1 — update as needed
  default = "ami-0f58b397bc5c1f2e8"
}

# ── Data sources ───────────────────────────────────────────────────
data "aws_availability_zones" "available" {
  state = "available"
}

# ── VPC ────────────────────────────────────────────────────────────
resource "aws_vpc" "eazybank" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = { Name = "eazybank-vpc" }
}

resource "aws_internet_gateway" "eazybank" {
  vpc_id = aws_vpc.eazybank.id
  tags   = { Name = "eazybank-igw" }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.eazybank.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true
  tags                    = { Name = "eazybank-public-subnet" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.eazybank.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.eazybank.id
  }
  tags = { Name = "eazybank-public-rt" }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# ── Security Group ─────────────────────────────────────────────────
resource "aws_security_group" "eazybank_k8s" {
  name        = "eazybank-k8s-sg"
  description = "EazyBank K8s node — minimal required ports"
  vpc_id      = aws_vpc.eazybank.id

  # SSH — restricted to your IP only
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ip]
    description = "SSH from admin IP"
  }

  # K8s API server — restricted to your IP
  ingress {
    from_port   = 6443
    to_port     = 6443
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ip]
    description = "kubectl API access"
  }

  # EazyBank frontend NodePort
  ingress {
    from_port   = 30080
    to_port     = 30080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "EazyBank frontend HTTP"
  }

  # Kibana NodePort
  ingress {
    from_port   = 30601
    to_port     = 30601
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ip]
    description = "Kibana"
  }

  # Grafana NodePort
  ingress {
    from_port   = 30300
    to_port     = 30300
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ip]
    description = "Grafana"
  }

  # Alertmanager NodePort
  ingress {
    from_port   = 30093
    to_port     = 30093
    protocol    = "tcp"
    cidr_blocks = [var.allowed_ip]
    description = "Alertmanager"
  }

  # HTTP/HTTPS for cert-manager ACME challenge + ingress
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP + ACME challenge"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }

  # All outbound allowed
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound"
  }

  tags = { Name = "eazybank-k8s-sg" }
}

# ── IAM Role for EC2 (SSM + ECR access) ───────────────────────────
resource "aws_iam_role" "eazybank_ec2" {
  name = "eazybank-ec2-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.eazybank_ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "eazybank_ec2" {
  name = "eazybank-ec2-profile"
  role = aws_iam_role.eazybank_ec2.name
}

# ── EC2 Instance ───────────────────────────────────────────────────
resource "aws_instance" "eazybank_k8s" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  key_name               = var.key_name
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.eazybank_k8s.id]
  iam_instance_profile   = aws_iam_instance_profile.eazybank_ec2.name

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 30
    delete_on_termination = true
    encrypted             = true
    tags                  = { Name = "eazybank-root" }
  }

  # User data — minimal bootstrap (Ansible handles the rest)
  user_data = base64encode(<<-EOF
    #!/bin/bash
    set -ex
    hostnamectl set-hostname eazybank-k8s-master
    yum update -y
    yum install -y python3 git
    # Install Ansible for self-provisioning
    pip3 install ansible
    echo "Bootstrap complete — run Ansible playbook next"
  EOF
  )

  tags = { Name = "eazybank-k8s-master" }
}

# ── Elastic IP ─────────────────────────────────────────────────────
resource "aws_eip" "eazybank" {
  instance = aws_instance.eazybank_k8s.id
  domain   = "vpc"
  tags     = { Name = "eazybank-eip" }
}

# ── EBS volume for Elasticsearch (20Gi, gp3) ──────────────────────
resource "aws_ebs_volume" "elasticsearch" {
  availability_zone = data.aws_availability_zones.available.names[0]
  size              = 20
  type              = "gp3"
  encrypted         = true
  tags              = { Name = "eazybank-elasticsearch-data" }
}

resource "aws_volume_attachment" "elasticsearch" {
  device_name  = "/dev/xvdf"
  volume_id    = aws_ebs_volume.elasticsearch.id
  instance_id  = aws_instance.eazybank_k8s.id
  force_detach = true
}

# ── S3 bucket for Trivy scan reports ──────────────────────────────
resource "aws_s3_bucket" "trivy_reports" {
  bucket = "eazybank-trivy-reports-${random_id.suffix.hex}"
  tags   = { Name = "eazybank-trivy-reports" }
}

resource "aws_s3_bucket_versioning" "trivy_reports" {
  bucket = aws_s3_bucket.trivy_reports.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "trivy_reports" {
  bucket = aws_s3_bucket.trivy_reports.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "random_id" "suffix" {
  byte_length = 4
}

# ── Outputs ────────────────────────────────────────────────────────
output "public_ip" {
  description = "EC2 Elastic IP — use for kubectl and browser access"
  value       = aws_eip.eazybank.public_ip
}

output "ssh_command" {
  description = "SSH command"
  value       = "ssh -i ~/.ssh/${var.key_name}.pem ec2-user@${aws_eip.eazybank.public_ip}"
}

output "frontend_url" {
  description = "EazyBank frontend NodePort URL"
  value       = "http://${aws_eip.eazybank.public_ip}:30080"
}

output "kibana_url" {
  value = "http://${aws_eip.eazybank.public_ip}:30601"
}

output "grafana_url" {
  value = "http://${aws_eip.eazybank.public_ip}:30300"
}

output "trivy_bucket" {
  value = aws_s3_bucket.trivy_reports.bucket
}

# ─────────────────────────────────────────────────────────────────
#  terraform.tfvars (create this file — do NOT commit to Git):
#
#  key_name   = "your-ec2-keypair-name"
#  allowed_ip = "YOUR_PUBLIC_IP/32"
# ─────────────────────────────────────────────────────────────────
