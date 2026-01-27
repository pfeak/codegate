"""
签名计算模块测试
"""

import unittest
from codegate_sdk.signature import generate_signature, EMPTY_STRING_HASH


class TestSignature(unittest.TestCase):
    
    def test_generate_signature_get_no_params(self):
        """测试 GET 请求（无查询参数）的签名生成"""
        signature = generate_signature(
            method="GET",
            path="/api/v1/projects/test",
            query_params=None,
            body=None,
            timestamp=1704153600,
            secret="test_secret"
        )
        self.assertIsInstance(signature, str)
        self.assertEqual(len(signature), 64)  # SHA256 十六进制字符串长度为 64
    
    def test_generate_signature_get_with_params(self):
        """测试 GET 请求（有查询参数）的签名生成"""
        signature = generate_signature(
            method="GET",
            path="/api/v1/projects/test/codes",
            query_params={"page": "1", "page_size": "20"},
            body=None,
            timestamp=1704153600,
            secret="test_secret"
        )
        self.assertIsInstance(signature, str)
        self.assertEqual(len(signature), 64)
    
    def test_generate_signature_post_with_body(self):
        """测试 POST 请求（有请求体）的签名生成"""
        import json
        body_data = {"code": "ABC12345"}
        body = json.dumps(body_data, ensure_ascii=False)
        signature = generate_signature(
            method="POST",
            path="/api/v1/projects/test/codes/verify",
            query_params=None,
            body=body,
            timestamp=1704153600,
            secret="test_secret"
        )
        self.assertIsInstance(signature, str)
        self.assertEqual(len(signature), 64)
    
    def test_empty_string_hash_constant(self):
        """测试空字符串哈希常量"""
        import hashlib
        expected_hash = hashlib.sha256("".encode('utf-8')).hexdigest()
        self.assertEqual(EMPTY_STRING_HASH, expected_hash)
    
    def test_missing_timestamp(self):
        """测试缺少时间戳参数"""
        with self.assertRaises(ValueError):
            generate_signature(
                method="GET",
                path="/api/v1/projects/test",
                secret="test_secret"
            )
    
    def test_missing_secret(self):
        """测试缺少 Secret 参数"""
        with self.assertRaises(ValueError):
            generate_signature(
                method="GET",
                path="/api/v1/projects/test",
                timestamp=1704153600
            )


if __name__ == '__main__':
    unittest.main()
