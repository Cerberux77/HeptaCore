const nextConfig = {
  transpilePackages: ["@heptacore/agents", "@heptacore/core", "@heptacore/ui"],
  outputFileTracingIncludes: {
    "/api/tenant-assets/[[...path]]": [
      "./examples/tenants/turpial/content/inbox/**/*",
      "../../examples/tenants/turpial/content/inbox/**/*"
    ]
  }
};

export default nextConfig;
