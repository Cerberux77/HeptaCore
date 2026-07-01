[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$Operator,

  [Parameter(Mandatory = $true)]
  [string]$Harness,

  [Parameter(Mandatory = $true)]
  [string]$Instance,

  [string]$Repo = "."
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoPath = (Resolve-Path -LiteralPath $Repo).Path

Push-Location $repoPath
try {
  & npx --no-install oreshnik --version
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  & npm run oreshnik:ready
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

  & npx oreshnik align `
    --operator $Operator `
    --harness $Harness `
    --instance $Instance `
    --repo $repoPath `
    --check `
    --json
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
