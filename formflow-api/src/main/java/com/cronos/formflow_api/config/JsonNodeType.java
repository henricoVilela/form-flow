package com.cronos.formflow_api.config;

import java.io.Serializable;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;

import org.hibernate.engine.spi.SharedSessionContractImplementor;
import org.hibernate.usertype.UserType;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

public class JsonNodeType implements UserType<JsonNode> {

    private static final ObjectMapper MAPPER = JsonMapper.builder().build();

    @Override
    public int getSqlType() {
        return Types.OTHER;
    }

    @Override
    public Class<JsonNode> returnedClass() {
        return JsonNode.class;
    }

    @Override
    public boolean equals(JsonNode x, JsonNode y) {
        if (x == y) return true;
        if (x == null || y == null) return false;
        return x.equals(y);
    }

    @Override
    public int hashCode(JsonNode x) {
        return x == null ? 0 : x.hashCode();
    }

    @Override
    public JsonNode nullSafeGet(ResultSet rs, int position, SharedSessionContractImplementor session, Object owner)
            throws SQLException {
        String value = rs.getString(position);
        if (rs.wasNull() || value == null) return null;
        try {
            return MAPPER.readTree(value);
        } catch (Exception e) {
            throw new SQLException("Failed to deserialize JSONB to JsonNode", e);
        }
    }

    @Override
    public void nullSafeSet(PreparedStatement st, JsonNode value, int index, SharedSessionContractImplementor session)
            throws SQLException {
        if (value == null) {
            st.setNull(index, Types.OTHER);
        } else {
            try {
                st.setObject(index, MAPPER.writeValueAsString(value), Types.OTHER);
            } catch (Exception e) {
                throw new SQLException("Failed to serialize JsonNode to JSONB", e);
            }
        }
    }

    @Override
    public JsonNode deepCopy(JsonNode value) {
        return value == null ? null : value.deepCopy();
    }

    @Override
    public boolean isMutable() {
        return true;
    }

    @Override
    public Serializable disassemble(JsonNode value) {
        if (value == null) return null;
        try {
            return MAPPER.writeValueAsString(value);
        } catch (Exception e) {
            throw new RuntimeException("Failed to disassemble JsonNode", e);
        }
    }

    @Override
    public JsonNode assemble(Serializable cached, Object owner) {
        if (cached == null) return null;
        try {
            return MAPPER.readTree((String) cached);
        } catch (Exception e) {
            throw new RuntimeException("Failed to assemble JsonNode", e);
        }
    }
}
