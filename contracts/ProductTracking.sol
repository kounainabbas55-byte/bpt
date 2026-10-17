// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
/// Stores only product/tracking data. No customer or confidential business data.
contract ProductTracking {
    enum Role { None, Manufacturer, Distributor, Retailer }
    struct Product { string id; string name; string category; string batch; string origin; uint64 mfgDate;
        address manufacturer; address currentOwner; string status; uint64 registeredAt; bool exists; }
    struct TrackEvent { address actor; address to; string location; string status; string note; uint64 timestamp; }

    address public admin;
    mapping(address => Role) public roles;
    mapping(string => Product) private products;
    mapping(string => TrackEvent[]) private history; // append-only
    string[] public productIds;

    event RoleGranted(address indexed user, Role role);
    event EventRecorded(bytes32 indexed key, uint256 index, address indexed actor, string status);

    modifier onlyAdmin() { require(msg.sender == admin, "Only admin"); _; }
    modifier onlyOwner(string memory id) {
        require(products[id].exists, "Product not found");
        require(products[id].currentOwner == msg.sender, "Not current owner"); _;
    }
    constructor() { admin = msg.sender; }

    function grantRole(address user, Role role) external onlyAdmin {
        require(role != Role.None && user != address(0), "Invalid role");
        roles[user] = role; emit RoleGranted(user, role);
    }
    function _log(string memory id, address to, string memory loc, string memory status, string memory note) internal {
        history[id].push(TrackEvent(msg.sender, to, loc, status, note, uint64(block.timestamp)));
        emit EventRecorded(keccak256(bytes(id)), history[id].length - 1, msg.sender, status);
    }
    function registerProduct(string calldata id, string calldata name, string calldata category,
        string calldata batch, string calldata origin, uint64 mfgDate) external {
        require(roles[msg.sender] == Role.Manufacturer, "Only manufacturer");
        require(bytes(id).length > 0 && bytes(id).length <= 64 && bytes(name).length > 0, "Invalid input");
        require(!products[id].exists, "Product ID already exists");
        products[id] = Product(id, name, category, batch, origin, mfgDate, msg.sender, msg.sender, "Registered", uint64(block.timestamp), true);
        productIds.push(id);
        _log(id, address(0), origin, "Registered", "Product registered by manufacturer");
    }
    function updateProductStatus(string calldata id, string calldata status, string calldata location, string calldata note)
        external onlyOwner(id) {
        require(bytes(status).length > 0 && bytes(status).length <= 64, "Invalid status");
        products[id].status = status; _log(id, address(0), location, status, note);
    }
    /// Manufacturer -> Distributor -> Retailer only.
    function transferProduct(string calldata id, address to, string calldata location, string calldata note)
        external onlyOwner(id) {
        Role from = roles[msg.sender]; Role target = roles[to];
        require((from == Role.Manufacturer && target == Role.Distributor) ||
                (from == Role.Distributor && target == Role.Retailer), "Invalid transfer path");
        products[id].currentOwner = to;
        string memory s = target == Role.Distributor ? "Dispatched to Distributor" : "Dispatched to Retailer";
        products[id].status = s; _log(id, to, location, s, note);
    }
    function getProductDetails(string calldata id) external view returns (Product memory) {
        require(products[id].exists, "Product not found"); return products[id];
    }
    function getProductHistory(string calldata id) external view returns (TrackEvent[] memory) { return history[id]; }
    function verifyProduct(string calldata id) external view returns (bool registered, address manufacturer, bool manufacturerAuthorized, uint256 eventCount) {
        Product storage p = products[id];
        return (p.exists, p.manufacturer, roles[p.manufacturer] == Role.Manufacturer, history[id].length);
    }
    function productCount() external view returns (uint256) { return productIds.length; }
}
