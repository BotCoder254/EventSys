// middleware/auth.js
module.exports.isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated && req.isAuthenticated()) { // This line checks if the user is authenticated
      return next();
    }
    res.redirect('/login');  // Redirect to login if the user is not authenticated
  };
  