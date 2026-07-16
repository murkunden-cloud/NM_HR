# User Creation and Hierarchy Logic
When creating or managing users, remember that a user can be assigned to work at a division or subdivision and can also be an admin. 
Their scope can be assigned to either their specific circle, division, subdivision, or "all" (if applicable).
The hierarchy logic dictates that they should be able to see and edit data up to their circle (i.e. within their assigned hierarchy scope).
For APIs serving data, always ensure that filtering logic properly respects `zonenm`, `circl`, `divnm`, and `subdnm` depending on the user's level. If no location fields are assigned and the user is not an admin, they should not see all data by default.
