param([string]$EnvFile = ".\.env.rrss")

function Get-EnvValue($name) {
  $line = Get-Content $EnvFile | Where-Object { $_ -match "^$name=" } | Select-Object -First 1
  if (-not $line) { return $null }
  return ($line -split "=", 2)[1].Trim().Trim('"').Trim("'")
}

function Is-Valid($value) {
  return $value -and $value -ne "PENDIENTE" -and $value -ne "" -and $value -ne '""'
}

$TOK = Get-EnvValue "META_ACCESS_TOKEN"
if (-not (Is-Valid $TOK)) { $TOK = Get-EnvValue "FACEBOOK_PAGE_ACCESS_TOKEN" }

$PID9 = Get-EnvValue "META_PAGE_ID"
if (-not (Is-Valid $PID9)) { $PID9 = Get-EnvValue "FACEBOOK_PAGE_ID" }
if (-not (Is-Valid $PID9)) { $PID9 = "1129437930248909" }

$IGID = Get-EnvValue "META_INSTAGRAM_BUSINESS_ID"
if (-not (Is-Valid $IGID)) { $IGID = Get-EnvValue "INSTAGRAM_BUSINESS_ACCOUNT_ID" }
if (-not (Is-Valid $IGID)) { $IGID = "17841472923130843" }

if (-not (Is-Valid $TOK)) { throw "META_ACCESS_TOKEN missing: no valid META_ACCESS_TOKEN or FACEBOOK_PAGE_ACCESS_TOKEN found in $EnvFile" }

Write-Host "META_ACCESS_TOKEN=FOUND length=$($TOK.Length) last6=$($TOK.Substring([Math]::Max(0,$TOK.Length-6)))"
Write-Host "META_PAGE_ID=$PID9"
Write-Host "META_INSTAGRAM_BUSINESS_ID=$IGID"

$env:META_ACCESS_TOKEN = $TOK
$env:META_PAGE_ID = $PID9
$env:META_INSTAGRAM_BUSINESS_ID = $IGID
