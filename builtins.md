+## Parsing URLs
+
+```
+const url = new URL("https://foo.com/path?foo=bar");
+url.hostname; // foo.com
+url.pathname; // /path
+url.searchParams.get("foo"); //bar
+```
+
+## Internationalization
+
+`Intl` can do a lot nowadays
