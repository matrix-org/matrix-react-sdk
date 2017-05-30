#!/usr/bin/perl -ni

use strict;
use warnings;

# script which synchronises i18n strings to include punctuation.
# i've cherry-picked ones which seem to have diverged between the different translations
# from TextForEvent, causing missing events all over the place

BEGIN {
$::fixups = [split(/\n/, <<EOT
%(targetName)s accepted the invitation for %(displayName)s.
%(targetName)s accepted an invitation.
%(senderName)s requested a VoIP conference.
%(senderName)s invited %(targetName)s.
%(senderName)s banned %(targetName)s.
%(senderName)s changed their display name from %(oldDisplayName)s to %(displayName)s.
%(senderName)s set their display name to %(displayName)s.
%(senderName)s removed their display name (%(oldDisplayName)s).
%(senderName)s removed their profile picture.
%(senderName)s changed their profile picture.
%(senderName)s set a profile picture.
VoIP conference started.
%(targetName)s joined the room.
VoIP conference finished.
%(targetName)s rejected the invitation.
%(targetName)s left the room.
%(senderName)s unbanned %(targetName)s.
%(senderName)s kicked %(targetName)s.
%(senderName)s withdrew %(targetName)s's inivitation.
%(targetName)s left the room.
%(senderDisplayName)s changed the topic to "%(topic)s".
%(senderDisplayName)s changed the room name to %(roomName)s.
%(senderDisplayName)s sent an image.
%(senderName)s answered the call.
%(senderName)s ended the call.
%(senderName)s placed a %(callType)s call.
%(senderName)s sent an invitation to %(targetDisplayName)s to join the room.
%(senderName)s turned on end-to-end encryption (algorithm %(algorithm)s).
%(senderName)s changed the power level of %(powerLevelDiffText)s.
For security, this session has been signed out. Please sign in again.
You need to log back in to generate end-to-end encryption keys for this device and submit the public key to your homeserver. This is a once off; sorry for the inconvenience.
A new password must be entered.
Guests can't set avatars. Please register.
Failed to set avatar.
Unable to verify email address.
Guests can't use labs features. Please register.
A new password must be entered.
Resetting password will currently reset any end-to-end encryption keys on all devices, making encrypted chat history unreadable, unless you first export your room keys and re-import them afterwards. In future this will be improved.
Guests cannot join this room even if explicitly invited.
EOT
)];
}

# example i18n format:
#   "%(oneUser)sleft": "%(oneUser)sleft",

# script called with the line of the file to be checked
my $sub = 0;
if ($_ =~ m/^(\s+)"(.*?)"(: *)"(.*?)"(,?)$/) {
    my ($indent, $src, $colon, $dst, $comma) = ($1, $2, $3, $4, $5);
    $src =~ s/\\"/"/g;
    $dst =~ s/\\"/"/g;

    foreach my $fixup (@{$::fixups}) {
        my $dotless_fixup = substr($fixup, 0, -1);

        if ($src eq $dotless_fixup) {
            print STDERR "fixing up src: $src\n";
            $src .= '.';
            $sub = 1;
        }

        if ($src eq $fixup && $dst !~ /\.$/) {
            print STDERR "fixing up dst: $dst\n";
            $dst .= '.';
            $sub = 1;            
        }

        if ($sub) {
            $src =~ s/"/\\"/g;
            $dst =~ s/"/\\"/g;
            print qq($indent"$src"$colon"$dst"$comma\n);
            last;
        }        
    }
}

if (!$sub) {
    print $_;
}
