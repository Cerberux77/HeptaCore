param(
  [string]$EnvFile = ".\.env.rrss"
)

function Get-EnvValue {
  param([string]$Name)
  $line = Get-Content $EnvFile | Where-Object { $_ -match "^$Name=" } | Select-Object -First 1
  if (-not $line) { return $null }
  return ($line -split "=", 2)[1].Trim().Trim('"').Trim("'")
}

$TOK = Get-EnvValue "META_ACCESS_TOKEN"
if ($TOK -eq "PENDIENTE") { $TOK = Get-EnvValue "FACEBOOK_PAGE_ACCESS_TOKEN" }

$PID9 = Get-EnvValue "META_PAGE_ID"
if ($PID9 -eq "PENDIENTE") { $PID9 = Get-EnvValue "FACEBOOK_PAGE_ID" }

$IGID = Get-EnvValue "META_INSTAGRAM_BUSINESS_ID"
if ($IGID -eq "PENDIENTE") { $IGID = Get-EnvValue "INSTAGRAM_BUSINESS_ACCOUNT_ID" }

if (-not $TOK) { Write-Error "META_ACCESS_TOKEN not found" }
if (-not $PID9) { Write-Error "META_PAGE_ID not found" }
if (-not $IGID) { Write-Error "META_INSTAGRAM_BUSINESS_ID not found" }

Write-Host "TOK length=$($TOK.Length) PID9=$PID9 IGID=$IGID"
Write-Host ""

Write-Host "--- Setting Vercel env vars ---"

$envVarSets = @(
  @{Name="META_PAGE_ID"; Value=$PID9},
  @{Name="META_INSTAGRAM_BUSINESS_ID"; Value=$IGID},
  @{Name="META_ACCESS_TOKEN"; Value=$TOK}
)

foreach ($envVar in $envVarSets) {
  $name = $envVar.Name
  $value = $envVar.Value
  Write-Host "Setting $name ..."
  $value | vercel env add $name production --sensitive --force 2>&1
}

Write-Host "META env vars pushed to Vercel production"
