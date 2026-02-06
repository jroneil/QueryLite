"""
PII Masker Service - Redacting sensitive information from results
"""

import re
import json
import logging
from typing import Any, List, Dict, Optional

class PIIMasker:
    # Common PII Regular Expressions
    PATTERNS = {
        "email": r"[\w.-]+@[\w.-]+\.\w+",
        "phone": r"(\+?\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}",
        "ssn": r"\d{3}-\d{2}-\d{4}",
        "credit_card": r"\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}",
        "ipv4": r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b"
    }

    @staticmethod
    def mask_string(text: str) -> str:
        """Mask PII patterns within a string"""
        if not text or not isinstance(text, str):
            return text
            
        masked_text = text
        
        # 1. Mask Email (partial visibility: ***@domain.com)
        def mask_email(match):
            email = match.group(0)
            user, domain = email.split('@')
            return f"{user[0]}***@{domain}" if len(user) > 1 else f"***@{domain}"
            
        masked_text = re.sub(PIIMasker.PATTERNS["email"], mask_email, masked_text)
        
        # 2. Mask others fully
        for name, pattern in PIIMasker.PATTERNS.items():
            if name == "email": continue
            masked_text = re.sub(pattern, "[REDACTED]", masked_text)
            
        return masked_text

    @staticmethod
    def mask_results(results: List[Dict[str, Any]], enabled: bool = True) -> List[Dict[str, Any]]:
        """Process a list of dictionaries and mask all string values containing PII"""
        if not enabled or not results:
            return results
            
        masked_results = []
        for row in results:
            new_row = {}
            for key, value in row.items():
                if isinstance(value, str):
                    # Check for simple keywords that usually indicate PII to be more aggressive
                    lower_key = key.lower()
                    if any(kw in lower_key for kw in ["password", "secret", "token", "key"]):
                        new_row[key] = "[REDACTED]"
                    else:
                        new_row[key] = PIIMasker.mask_string(value)
                elif isinstance(value, (dict, list)):
                    # Deep masking for JSON fields
                    try:
                        str_val = json.dumps(value)
                        masked_str = PIIMasker.mask_string(str_val)
                        new_row[key] = json.loads(masked_str)
                    except:
                        new_row[key] = value
                else:
                    new_row[key] = value
            masked_results.append(new_row)
            
        return masked_results
