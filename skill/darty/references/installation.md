# Install or recover the executable

Read the canonical [Darty installation guide](https://github.com/cpaikr/darty/blob/main/README.md#설치)
for prerequisites, platform selection, authenticated release downloads,
checksum verification, installation, PATH, and upgrades. Follow its branch for
the user's operating system and chosen destination. Installation facts live
there so this package does not maintain a second installer recipe.

The [private GitHub Releases](https://github.com/cpaikr/darty/releases) channel
requires repository access to obtain artifacts. That access is separate from
public DART data retrieval. If the guide or release cannot be accessed, report
the unavailable resource and request access or user-provided release files;
do not invent an npm installation command or substitute a source build.

Apply installation changes within the user's existing authorization. An
update notice alone is not an upgrade request. Keep the archive, checksums,
and installer from the same authenticated release and use its verification
procedure before installing.

Verify `darty --help` first through the actual executable's full path, then by
command name in the intended consumer shell. File visibility and PATH lookup
are distinct. For Windows redirected paths or a stale shell PATH, follow the
guide's recovery steps for the selected destination. A working installer
subprocess alone does not prove the user's terminal can see the executable.

After verification, resume the original task. CLI installation does not
require SDK installation or OpenDART API credentials.
