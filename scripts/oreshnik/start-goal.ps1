[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$Harness,

  [string]$Operator,

  [string]$Instance,

  [string]$Session,

  [string]$Repo = ".",

  [int]$MaxRetries = 3
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoPath = (Resolve-Path -LiteralPath $Repo).Path
$goalArgs = @(
  "oreshnik",
  "goal",
  "--harness", $Harness,
  "--repo", $repoPath,
  "--max-retries", $MaxRetries.ToString(),
  "--json"
)

if ($PSBoundParameters.ContainsKey("Operator")) {
  $goalArgs += @("--operator", $Operator)
}

if ($PSBoundParameters.ContainsKey("Instance")) {
  $goalArgs += @("--instance", $Instance)
}

if ($PSBoundParameters.ContainsKey("Session")) {
  $goalArgs += @("--session", $Session)
}

Push-Location $repoPath
try {
  & npx @goalArgs
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
