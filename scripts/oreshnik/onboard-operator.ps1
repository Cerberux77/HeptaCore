[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$Operator,

  [Parameter(Mandatory = $true)]
  [string]$Harness,

  [string]$Instance = "new",

  [string]$Repo = "."
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoPath = (Resolve-Path -LiteralPath $Repo).Path

Push-Location $repoPath
try {
  & npx oreshnik align `
    --operator $Operator `
    --harness $Harness `
    --instance $Instance `
    --repo $repoPath `
    --apply `
    --json
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
