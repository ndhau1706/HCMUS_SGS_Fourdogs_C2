# Preserve and diagnose an existing Tide realm

Use repair first. A local user record, a linked Tide identity and a remote licensed allocation are separate objects. Deleting a realm, user or Docker volume does not establish that an allocation was released. A new container cannot resolve a remote quota or outage.

## Read-only checks

```bash
npm run check:realm
npm run check:license
DOCKER_HOST=unix:///var/run/docker.sock docker exec cloudguard-tidecloak cat /etc/resolv.conf
```

`check:license` uses the installed console's `vendorResources/billing/summary` and the documented `vendorResources/getLicenseDetails`. It prints an allowlist of status, capacity, usage and expiry fields. It never prints billing contacts, keys, identifiers, tokens or raw responses. Empty/non-JSON responses, failed calls and invalid counts remain unknown; an incomplete billing reading exits nonzero. A full license is a valid diagnostic result, not permission to create more accounts. These operator commands require the private `.env`; they are not application endpoints.

Compare remote usage with the separate realm inventory. The APIs above do not expose an allocation roster or prove which unfinished enrollments consume seats. The [official admin API reference](https://docs.tide.org/API/Admin%20API%20Reference), [license guide](https://docs.tide.org/Admin/license) and [licensing concepts](https://docs.tide.org/Core-Concepts/Licensing) do not document a per-identity seat-release API. Do not invent one or treat local deletion as remote release. Ask [Tide support](https://docs.tide.org/Contact/) for the allocation roster, reservation/deprovisioning semantics and a supported recovery procedure. Keep subscription identifiers and diagnostics private; never send credentials or enrollment links.

## Consistent backups and rollback

Store recovery material under Git-ignored `.data/reset-backups/`, directories mode 700 and files mode 600. Docker inspection and filesystem exports contain secrets: archive them privately and do not paste them into issues or terminal transcripts.

For this development image, H2 is bind-mounted at `data/` → `/opt/keycloak/data/h2`. Stop **only** `cloudguard-tidecloak` gracefully before copying it. Do not copy a running H2 directory as a consistency guarantee. Capture:

- The stopped database, genuine adapter, `.env`, bootstrap markers and local operator configuration.
- Full `docker inspect`, image inspection, exact image ID/digest, `docker image save` and stopped-container `docker export` (exports omit mounted data, so the separate database backup is required).
- Project setup/auth scripts and docs; private realm, IdP/client/role/user mappings, license components and QEA metadata. The complete offline database preserves governed state even if a JSON export is incomplete.

Record archive SHA-256 checksums, verify all archives can be read and compare archived H2 files with the stopped source. If possible, use the matching bundled H2 tools to recover the **backup copy** and restore its logical SQL into an isolated database. Keep that SQL private. Never run recovery tools on the live database. Do not start a second copy of the licensed realm just to validate the archive.

For rollback while retaining the original container:

1. Stop CloudGuard and the named Tide container. Verify it is stopped.
2. Verify backup checksums. Preserve the current `data/` and `.env` in another private recovery directory before replacing anything.
3. Extract archived `data/` and `.env` into a private staging directory; restore them at the original project paths, retaining permissions. Keep the original container/image and unrelated containers intact.
4. Start the original container against the restored bind mount. Check discovery, `check:realm`, `check:license` and the app. Do not rerun realm initialization or license activation.

If the original container/image has been lost, load the saved image and recreate its inspected configuration, including exact environment, entrypoint, bind mounts and loopback port binding. Do not substitute `latest`, reset keys or provision a new vendor. Account for genuine governance changes made after the backup; do not use rollback to evade approvals or licensing.

## DNS and external connectivity

Check the **current** host and container resolvers; old observations may no longer apply after a restart or network change. Docker normally derives DNS from the host. If that resolver works from the container, retain the existing service. Do not recreate a functioning container just to pin a public DNS server.

For a genuinely new installation, optional `TIDECLOAK_DNS` in `.env` accepts a quoted, space-separated list of tested resolver IP addresses. Bootstrap passes each as a container-scoped `--dns`. Empty means Docker/host defaults. Changing this variable does not modify an existing container; bootstrap still refuses to overwrite existing state. Avoid global daemon changes and recheck after changing networks.

Test DNS A/AAAA and verified HTTPS from the host, the existing container and the browser. Do not hardcode ORK IPs or disable certificate checks. A homepage 200 is a transport check; it does not prove enrollment, token signing or QEA signing. Browser Local Network Access is a separate origin permission; follow [Tide's browser guide](https://docs.tide.org/FAQ/chromium-error), without disabling browser security.

## Continue genuine enrollment only when capacity permits

Preserve the enrolled first admin. Reuse the existing unlinked second-admin record. Keep one-time links in private local files and have each independent owner complete their own identity, password and recovery. Create the third admin and Employee only once prerequisites and available capacity are established. Review any existing pending Employee creation instead of submitting a duplicate.

Admin role grants and policy regeneration require genuine enclave authorization. Do not auto-approve pending requests with master credentials. Verify three distinct enrolled admin-role holders, the signed policy and actual threshold on a live governed request. Employee starts with viewer and no effective operator/management privileges. Use [the demo acceptance and recording script](DEMO_SCRIPT.md) only after these conditions are met.
