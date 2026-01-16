"""
清理过期邀请码任务

Copyright 2026 pfeak

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
"""
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_

from ..database import get_db_context
from ..models.project import Project
from ..models.invitation_code import InvitationCode
from ..models.verification_log import VerificationLog
from ..core.constants import DEFAULT_CLEANUP_RETENTION_DAYS


def cleanup_expired_codes(
    retention_days: int = DEFAULT_CLEANUP_RETENTION_DAYS,
    dry_run: bool = False,
) -> dict:
    """
    清理过期项目的邀请码和日志

    Args:
        retention_days: 保留天数（过期项目在过期后保留多少天）
        dry_run: 是否仅模拟运行（不实际删除）

    Returns:
        dict: 清理统计信息
    """
    cutoff_date = datetime.utcnow() - timedelta(days=retention_days)

    stats = {
        "projects_deleted": 0,
        "codes_deleted": 0,
        "logs_deleted": 0,
        "dry_run": dry_run,
    }

    with get_db_context() as db:
        # 查找所有已过期且超过保留期的项目
        expired_projects = db.query(Project).filter(
            and_(
                Project.expires_at.isnot(None),
                Project.expires_at < cutoff_date,
            )
        ).all()

        for project in expired_projects:
            # 统计该项目的邀请码和日志数量
            code_count = db.query(InvitationCode).filter(
                InvitationCode.project_id == project.id
            ).count()

            log_count = db.query(VerificationLog).join(InvitationCode).filter(
                InvitationCode.project_id == project.id
            ).count()

            if not dry_run:
                # 删除项目（级联删除邀请码和日志）
                db.delete(project)
                db.commit()

            stats["projects_deleted"] += 1
            stats["codes_deleted"] += code_count
            stats["logs_deleted"] += log_count

    return stats


if __name__ == "__main__":
    """命令行运行清理任务"""
    import argparse

    parser = argparse.ArgumentParser(description="清理过期邀请码")
    parser.add_argument(
        "--retention-days",
        type=int,
        default=DEFAULT_CLEANUP_RETENTION_DAYS,
        help=f"保留天数（默认: {DEFAULT_CLEANUP_RETENTION_DAYS}）",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="仅模拟运行，不实际删除",
    )

    args = parser.parse_args()

    print(f"开始清理过期邀请码（保留天数: {args.retention_days}，模拟运行: {args.dry_run}）...")
    stats = cleanup_expired_codes(
        retention_days=args.retention_days,
        dry_run=args.dry_run,
    )

    print(f"清理完成:")
    print(f"  删除项目数: {stats['projects_deleted']}")
    print(f"  删除邀请码数: {stats['codes_deleted']}")
    print(f"  删除日志数: {stats['logs_deleted']}")
