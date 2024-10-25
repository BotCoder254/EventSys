module.exports = (content) => `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
            <img src="https://yourdomain.com/images/logo.png" alt="EventSys Logo" style="max-width: 150px;">
        </div>
        <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
            ${content}
        </div>
        <div style="text-align: center; margin-top: 20px; color: #888;">
            &copy; 2024 EventSys. All rights reserved.
        </div>
    </div>
`;