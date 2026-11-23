// A gift is the part of a link after "#"; the host never sees it and cannot know it is there. A gift link whose
// path the host does not know (cut, mistyped, or from a wrapper's page that is gone) lands on this page: it is
// handed to the app at the root, with whatever followed "?" and "#", and the app reads the gift from the fragment
// alone. Nothing is sent anywhere.
if (location.hash.length > 1) location.replace('/' + location.search + location.hash);
