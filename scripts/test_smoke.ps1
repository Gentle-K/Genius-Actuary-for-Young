param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Args
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$pythonBin = if ($env:PYTHON_BIN) { $env:PYTHON_BIN } else { "python" }

& $pythonBin (Join-Path $scriptDir "test_smoke.py") @Args
exit $LASTEXITCODE
