const { process } = require("../");

describe("jest-raw-loader", () => {
  it("works as expected", () => {
    const processed = process(`
      # Markdown Test
      
      This is how a valid Markdown file would look.
    `);

    expect(processed).toMatchSnapshot();
  });
});
