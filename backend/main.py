"""
CodeGate 应用启动入口
端口可由环境变量 BACKEND_PORT 覆盖（如 scripts/start.sh 通过 .env.codegate 设置）。

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
import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("BACKEND_PORT", "8876"))
    uvicorn.run(
        "codegate.main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
    )
