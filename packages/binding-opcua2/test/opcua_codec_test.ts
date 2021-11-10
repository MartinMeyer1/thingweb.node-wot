import { exist } from "should";

import { ContentSerdes, ProtocolHelpers } from "@node-wot/core";
import { ObjectSchema } from "@node-wot/td-tools";

import { DataValue } from "node-opcua-data-value";
import { DataType, VariantArrayType } from "node-opcua-variant";
import { coerceLocalizedText } from "node-opcua-data-model";

import { jsonify, OpcuaBinaryCodec, OpcuaJSONCodec, theOpcuaBinaryCodec, theOpcuaJSONCodec } from "../src/codec";
import { opcuaJsonEncodeDataValue } from "node-opcua-json";
import { expect } from "chai";
import { StatusCodes } from "node-opcua-status-code";

const dataValue1 = new DataValue({});
const dataValue2 = new DataValue({
    // serverTimestamp: new Date(),

    statusCode: StatusCodes.Good,
    sourceTimestamp: new Date(Date.UTC(2021, 10, 11)),
    // sourcePicoseconds: 100,
    value: {
        dataType: DataType.String,
        arrayType: VariantArrayType.Array,
        value: ["hello", "world"],
    },
});
const dataValue3 = new DataValue({
    value: {
        dataType: DataType.LocalizedText,
        value: [coerceLocalizedText("a"), coerceLocalizedText("b")],
    },
});

const dataValue1Json = jsonify(opcuaJsonEncodeDataValue(dataValue1, true));
const dataValue2Json = jsonify(opcuaJsonEncodeDataValue(dataValue2, true));
const dataValue3Json = jsonify(opcuaJsonEncodeDataValue(dataValue3, true));

describe("OPCUA Binary Serdes ", () => {
    [dataValue1Json, dataValue2Json, dataValue3Json].forEach((dataValue, index) => {
        //
        const schema: ObjectSchema = { type: "object", properties: {} };

        it("should encode and decode a dataValue with application/opcua_binary codec " + index, () => {
            const payload = theOpcuaBinaryCodec.valueToBytes(dataValue, schema);
            const dataValueReloaded = theOpcuaBinaryCodec.bytesToValue(payload, schema);
            expect(dataValue).to.eql(dataValueReloaded);
        });
        it("should encode and decode a dataValue with application/opcua_json codec " + index, () => {
            const payload = theOpcuaJSONCodec.valueToBytes(dataValue, schema);
            const dataValueReloaded = theOpcuaJSONCodec.bytesToValue(payload, schema);
            expect(dataValue).to.eql(dataValueReloaded);
        });
    });

    const expected1 = [
        { Value: null },
        { Value: { Type: 12, Body: ["hello", "world"] }, SourceTimestamp: "2021-11-11T00:00:00.000Z" },
        { Value: { Type: 21, Body: [{ Text: "a" }, { Text: "b" }] } },
    ];
    [dataValue1, dataValue2, dataValue3].forEach((dataValue, index) => {
        it(
            "should simplify  serialize deserialize with application/json+opcua;type=DataValue  (index = " +
                index +
                ")",
            async () => {
                const serdes = ContentSerdes.get();
                serdes.addCodec(new OpcuaJSONCodec());
                serdes.addCodec(new OpcuaBinaryCodec());

                const schema: WoT.DataSchema = {};
                const contentType = "application/json+opcua;type=DataValue";
                exist(ContentSerdes.getMediaType(contentType));
                const payload = serdes.valueToContent(dataValue, schema, contentType);
                const body = await ProtocolHelpers.readStreamFully(payload.body);
                console.log(body.toString("ascii"));
                JSON.parse(body.toString()).should.eql(expected1[index]);
            }
        );
        const expected2 = [
            "null",
            '{"Type":12,"Body":["hello","world"]}',
            '{"Type":21,"Body":[{"Text":"a"},{"Text":"b"}]}',
        ];
        it("should serialize deserialize with application/json+opcua;type=Variant" + index, async () => {
            const serdes = ContentSerdes.get();
            serdes.addCodec(new OpcuaJSONCodec());
            serdes.addCodec(new OpcuaBinaryCodec());

            const schema: WoT.DataSchema = {};
            const contentType = "application/json+opcua;type=Variant";
            exist(ContentSerdes.getMediaType(contentType));
            const payload = serdes.valueToContent(dataValue, schema, contentType);
            const body = await ProtocolHelpers.readStreamFully(payload.body);
            console.log(body.toString("ascii"));
            body.toString().should.eql(expected2[index]);
        });
    });
});
