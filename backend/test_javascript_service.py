
from app.services.javascript_service import parse_javascript_file

code = """
class UserService {
    constructor() {}

    getUser(id) {
        return id;
    }
}

function greet(name) {
    return name;
}

const formatName = (name) => {
    return name.trim();
};
"""

result = parse_javascript_file(code, ".js")
print(result)

assert "UserService" in result["classes"]
assert "greet" in result["functions"]
assert "getUser" in result["functions"]
assert "constructor" in result["functions"]
assert "formatName" in result["functions"]
assert result["class_count"] == 1
assert result["function_count"] == 4
assert result["has_syntax_errors"] is False

print("All tests passed!")
