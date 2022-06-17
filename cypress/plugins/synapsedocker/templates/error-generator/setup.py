from setuptools import find_packages, setup

setup(
    name="error-generator",
    version="0.1.0",
    packages=find_packages(),
    description="A trivial spam-checker for Synapse designed to generate errors",
    include_package_data=True,
    zip_safe=True,
    author="davidt@element.io",
)
