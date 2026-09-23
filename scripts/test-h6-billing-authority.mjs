assert.match(
  status,
  /const platformExempt = platformSub\s*\? platformSub\.platformExempt === true\s*:\s*!expectsPlatformBilling \|\| billing\.platformExempt === true/,
  "PlatformSubscription exemption must be authoritative once a canonical row exists",
);
assert.match(
  status,
  /expectsPlatformBilling: platformSub \? !platformExempt : expectsPlatformBilling/,
  "billing kind must follow canonical PlatformSubscription exemption when one exists",
);

console.log("H-6 billing authority regression tests passed");
