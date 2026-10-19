
from tree_sitter_language_pack import get_parser

code = b"""
class UserService {
    constructor() {}

    getUser(id) {
        return id;
    }
}

function greet(name) {
    return name;
}
"""

parser = get_parser("javascript")
tree = parser.parse(code)


def extract_functions_and_classes(node):
    functions = []
    classes = []

    if node.type == "class_declaration":
        name_node = node.child_by_field_name("name")
        if name_node:
            classes.append(name_node.text.decode("utf-8"))

    elif node.type == "function_declaration":
        name_node = node.child_by_field_name("name")
        if name_node:
            functions.append(name_node.text.decode("utf-8"))

    elif node.type == "method_definition":
        name_node = node.child_by_field_name("name")
        if name_node:
            functions.append(name_node.text.decode("utf-8"))

    for child in node.children:
        child_functions, child_classes = extract_functions_and_classes(child)
        functions.extend(child_functions)
        classes.extend(child_classes)

    return functions, classes


functions, classes = extract_functions_and_classes(tree.root_node)

print("Functions and methods:", functions)
print("Classes:", classes)
